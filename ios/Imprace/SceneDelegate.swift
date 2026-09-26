import UIKit
import React

// With the scene lifecycle, the window belongs to a scene, not to the app.
// The React Native factory is still created once in AppDelegate; this just
// attaches it to the scene's window.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window // some libraries still look for the window on AppDelegate

    factory.startReactNative(
      withModuleName: "Imprace", // <- must match the name your app registers in JS
      in: window,
      launchOptions: nil
    )

    // Deep link that launched the app (previously in launchOptions)
    if let url = connectionOptions.urlContexts.first?.url {
      RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }
  }

  // Deep links while the app is running (previously application(_:open:options:))
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }
}