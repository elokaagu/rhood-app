#import <Foundation/Foundation.h>

/** Catch ObjC exceptions from RCTEventEmitter / MediaPlayer so they cannot kill the process. */
void RhoodSafeRun(void (^block)(void));
