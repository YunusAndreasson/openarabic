package expo.modules.wordwidget

import expo.modules.kotlin.Promise

/** Foreground and headless Expo runtimes share this process-wide gate. */
internal object AccountPublications {
  private var owner: String? = null
  private var active = 0
  private val waiting = mutableListOf<Promise>()

  @Synchronized fun open(id: String) { owner = id }
  @Synchronized fun enter(id: String): Boolean {
    if (owner != null && owner != id) return false
    active++
    return true
  }
  @Synchronized fun close(done: Promise) {
    owner = ""
    if (active == 0) done.resolve(null) else waiting.add(done)
  }
  @Synchronized fun leave() {
    active--
    if (active == 0) {
      waiting.forEach { it.resolve(null) }
      waiting.clear()
    }
  }
}
