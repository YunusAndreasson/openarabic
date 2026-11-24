Pod::Spec.new do |s|
  s.name = 'WordWidget'
  s.version = '1.0.0'
  s.summary = 'OpenArabic widget placement and owner generation'
  s.description = s.summary
  s.author = 'OpenArabic'
  s.homepage = 'https://github.com/edenmind/open-arabic'
  s.license = 'MIT'
  s.platform = :ios, '16.4'
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.framework = 'WidgetKit'
  s.source_files = '*.swift'
end
