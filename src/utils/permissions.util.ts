import { Platform } from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  type Permission,
  type PermissionStatus,
} from 'react-native-permissions';

export const permissions = {
  mic: Platform.select({
    android: PERMISSIONS.ANDROID.RECORD_AUDIO,
    ios: PERMISSIONS.IOS.MICROPHONE,
  }),
  camera: Platform.select({
    android: PERMISSIONS.ANDROID.CAMERA,
    ios: PERMISSIONS.IOS.CAMERA,
  }),
};

export type PermissionResult = 'granted' | 'denied' | 'blocked';

export const requestPermission = async (
  permission?: Permission,
): Promise<PermissionResult> => {
  // Platform.select can return undefined on an unhandled platform.
  if (!permission) return 'denied';

  // check() first so we can tell 'denied' (askable) from 'blocked'
  // (user already refused — request() won't re-prompt on iOS).
  let status: PermissionStatus = await check(permission);
  if (status === RESULTS.DENIED) {
    status = await request(permission);
  }

  switch (status) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return 'granted';
    case RESULTS.BLOCKED:
      return 'blocked';
    default:
      // DENIED (still askable, e.g. user dismissed) or UNAVAILABLE
      return 'denied';
  }
};
