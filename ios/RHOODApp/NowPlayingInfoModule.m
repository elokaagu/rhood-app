//
//  NowPlayingInfoModule.m
//  RHOODApp
//
//  React Native bridge header for NowPlayingInfoModule
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NowPlayingInfoModule, NSObject)

RCT_EXTERN_METHOD(setNowPlayingInfo:(NSDictionary *)info
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updatePlaybackTime:(double)position
                  duration:(double)duration
                  rate:(double)rate
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearNowPlayingInfo:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end

