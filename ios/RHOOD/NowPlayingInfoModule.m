//
//  NowPlayingInfoModule.m
//  RHOOD — Bridge for lock screen / Control Center (MPNowPlayingInfoCenter)
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import "RhoodSafeRun.h"

void RhoodSafeRun(void (^block)(void))
{
  @try {
    if (block) {
      block();
    }
  } @catch (NSException *exception) {
    NSLog(@"[RHOOD NowPlaying] swallowed exception %@: %@", exception.name, exception.reason);
  }
}

@interface RCT_EXTERN_MODULE(NowPlayingInfoModule, RCTEventEmitter)

RCT_EXTERN_METHOD(addListener:(NSString *)eventName)
RCT_EXTERN_METHOD(removeListeners:(double)count)

RCT_EXTERN_METHOD(setNowPlayingInfo:(NSDictionary *)info
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updatePlaybackTime:(nonnull NSNumber *)positionSec
                  durationSec:(nonnull NSNumber *)durationSec
                  playbackRate:(nonnull NSNumber *)playbackRate
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearNowPlayingInfo:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

@end
