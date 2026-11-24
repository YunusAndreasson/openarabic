import ExpoModulesCore
import Foundation
import WidgetKit

// Shared across foreground and background JS runtimes. A cold process starts
// with no outstanding registrations; the durable teardown still sweeps the OS.
private final class AccountPublications: @unchecked Sendable {
  static let shared = AccountPublications()
  private let lock = NSLock()
  private var owner: String?
  private var active = 0
  private var waiting: [Promise] = []
  func open(_ id: String) {
    lock.lock(); defer { lock.unlock() }
    owner = id
  }
  func enter(_ id: String) -> Bool {
    lock.lock(); defer { lock.unlock() }
    guard owner == nil || owner == id else { return false }
    active += 1
    return true
  }
  func close(_ done: Promise) {
    lock.lock()
    owner = ""
    if active > 0 { waiting.append(done); lock.unlock() }
    else { lock.unlock(); done.resolve(nil) }
  }
  func leave() {
    lock.lock()
    active -= 1
    let finished = active == 0 ? waiting : []
    if active == 0 { waiting.removeAll() }
    lock.unlock()
    finished.forEach { $0.resolve(nil) }
  }
}

public final class WordWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WordWidget")
    Function("openPublications") { (owner: String) in AccountPublications.shared.open(owner) }
    Function("beginPublication") { (owner: String) in AccountPublications.shared.enter(owner) }
    Function("endPublication") { AccountPublications.shared.leave() }
    AsyncFunction("closePublications") { (promise: Promise) in AccountPublications.shared.close(promise) }
    Function("matchesOwner") { (owner: String, generation: String) -> Bool in
      guard !generation.isEmpty, UserDefaults.standard.string(forKey: "wordWidgetOwner") == owner,
            let file = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.openarabic")?
              .appendingPathComponent("word-widget-generation") else { return false }
      return (try? String(contentsOf: file, encoding: .utf8)) == generation
    }
    Function("setOwner") { (owner: String) throws -> String in
      guard let directory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.openarabic") else {
        throw CocoaError(.fileNoSuchFile)
      }
      let file = directory.appendingPathComponent("word-widget-generation")
      let defaults = UserDefaults.standard
      if owner.isEmpty {
        if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
        defaults.removeObject(forKey: "wordWidgetOwner")
        let shared = UserDefaults(suiteName: "group.openarabic")
        shared?.removeObject(forKey: "__expo_widgets_WordInContext_timeline")
        WidgetCenter.shared.reloadTimelines(ofKind: "WordInContext")
        return ""
      }
      if defaults.string(forKey: "wordWidgetOwner") == owner,
         let token = try? String(contentsOf: file, encoding: .utf8), !token.isEmpty { return token }
      let token = UUID().uuidString
      try Data(token.utf8).write(to: file, options: [.atomic, .completeFileProtection])
      defaults.set(owner, forKey: "wordWidgetOwner")
      return token
    }
    AsyncFunction("placement") { (promise: Promise) in
      WidgetCenter.shared.getCurrentConfigurations { result in
        switch result {
        case .success(let widgets):
          let families = widgets.filter { ["WordInContext", "OpenText"].contains($0.kind) }
            .map { "\($0.kind)/\($0.family)" }
          let signedIn = UserDefaults.standard.string(forKey: "wordWidgetOwner") != nil
          promise.resolve(["families": Array(Set(families)), "canPin": false,
                           "accountState": signedIn ? "signed_in" : "guest"] as [String: Any])
        case .failure(let error): promise.reject(error)
        }
      }
    }
  }
}
