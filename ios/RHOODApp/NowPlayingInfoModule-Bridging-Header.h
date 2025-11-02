//
//  NowPlayingInfoModule-Bridging-Header.h
//  RHOODApp
//
//  Bridging header for React Native imports in Swift
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Type definitions for React Native promise blocks
typedef void (^RCTPromiseResolveBlock)(id result);
typedef void (^RCTPromiseRejectBlock)(NSString *code, NSString *message, NSError *error);

