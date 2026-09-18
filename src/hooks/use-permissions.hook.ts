import { useCallback, useEffect, useState } from 'react';
import {
  check,
  checkNotifications,
  requestNotifications,
  RESULTS,
  type PermissionStatus,
} from 'react-native-permissions';
import {
  permissions,
  requestPermission as requestOne,
  type PermissionResult,
} from '@/utils';
import { AppState } from 'react-native';

type PermissionName = keyof typeof permissions;
type Status = PermissionResult | 'unknown';

const toResult = (status: PermissionStatus): PermissionResult => {
  switch (status) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return 'granted';
    case RESULTS.BLOCKED:
      return 'blocked';
    default:
      return 'denied';
  }
};

export const usePermissions = (names: PermissionName[]) => {
  const [statuses, setStatuses] = useState<Record<PermissionName, Status>>(
    () =>
      Object.fromEntries(names.map(n => [n, 'unknown'])) as Record<
        PermissionName,
        Status
      >,
  );

  const key = names.join('|');

  const checkPermissions = useCallback(async (): Promise<
    Record<PermissionName, Status>
  > => {
    const entries = await Promise.all(
      names.map(async name => {
        const perm = permissions[name];
        const result: Status = perm ? toResult(await check(perm)) : 'denied';
        return [name, result] as const;
      }),
    );
    const results = Object.fromEntries(entries) as Record<
      PermissionName,
      Status
    >;
    setStatuses(prev => ({ ...prev, ...results }));
    return results;
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const name of names) {
        const perm = permissions[name];
        const result: Status = perm ? toResult(await check(perm)) : 'denied';
        if (!cancelled) setStatuses(prev => ({ ...prev, [name]: result }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    const focusSub = AppState.addEventListener('focus', state => {
      if (state === 'active') {
        checkPermissions();
      }
    });

    const changeSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        checkPermissions();
      }
    });

    return () => {
      focusSub.remove();
      changeSub.remove();
    };
  }, []);

  const requestPermissions = useCallback(async (): Promise<
    Record<PermissionName, PermissionResult>
  > => {
    const entries: [PermissionName, PermissionResult][] = [];

    for (const name of names) {
      const result = await requestOne(permissions[name]);
      entries.push([name, result]);
    }

    const results = Object.fromEntries(entries) as Record<
      PermissionName,
      PermissionResult
    >;
    setStatuses(prev => ({ ...prev, ...results }));
    return results;
  }, [key]);

  const allGranted = names.every(name => statuses[name] === 'granted');

  return { statuses, requestPermissions, checkPermissions, allGranted };
};

export const useNotificationsPermission = () => {
  const checkNotificationsPermission = async () => {
    const result = await checkNotifications();
    return toResult(result.status);
  };

  const requestNotificationsPermission = async () => {
    const result = await requestNotifications(['alert', 'sound', 'badge']);
    return toResult(result.status);
  };

  return { requestNotificationsPermission, checkNotificationsPermission };
};
