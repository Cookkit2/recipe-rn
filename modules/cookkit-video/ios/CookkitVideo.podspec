require 'json'
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))
Pod::Spec.new do |s|
  s.name = 'CookkitVideo'
  s.version = package['version']
  s.summary = package['description']
  s.description = package['description']
  s.license = package['license']
  s.author = 'Cookkit'
  s.homepage = 'https://github.com/Cookkit2/recipe-rn'
  s.source = { git: 'https://github.com/Cookkit2/recipe-rn.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'UIKit', 'WebKit'
  s.source_files = '**/*.swift'
end
