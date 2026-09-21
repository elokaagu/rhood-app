//
//  AudioTranscodeModule.m
//  RHOOD — Bridge for WAV → AAC mix conversion
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(AudioTranscodeModule, RCTEventEmitter)

RCT_EXTERN_METHOD(addListener:(NSString *)eventName)
RCT_EXTERN_METHOD(removeListeners:(double)count)

RCT_EXTERN_METHOD(transcodeToAac:(NSString *)sourceUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
