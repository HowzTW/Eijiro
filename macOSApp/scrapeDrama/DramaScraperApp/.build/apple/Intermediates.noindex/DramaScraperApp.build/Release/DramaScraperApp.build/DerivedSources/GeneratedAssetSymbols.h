#import <Foundation/Foundation.h>

#if __has_attribute(swift_private)
#define AC_SWIFT_PRIVATE __attribute__((swift_private))
#else
#define AC_SWIFT_PRIVATE
#endif

/// The "icon" asset catalog image resource.
static NSString * const ACImageNameIcon AC_SWIFT_PRIVATE = @"icon";

/// The "icon-app" asset catalog image resource.
static NSString * const ACImageNameIconApp AC_SWIFT_PRIVATE = @"icon-app";

#undef AC_SWIFT_PRIVATE
