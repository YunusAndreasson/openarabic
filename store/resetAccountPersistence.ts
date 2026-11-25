import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { accountSwitched } from './accountActions';
import { guestImportForgotten } from './guestLibrarySlice';
import { markReturningInstall } from './firstPageSlice';
import { persistor, store } from './store';

export async function resetAccountPersistence(deletedOwner?: string) {
  store.dispatch(accountSwitched());
  if (deletedOwner) store.dispatch(guestImportForgotten(deletedOwner));
  store.dispatch(markReturningInstall());
  await persistor.flush();
  // redux-persist catches storage failures internally. Require an acknowledged
  // write of just the device slices before we allow the session to end.
  const state = store.getState();
  await AsyncStorage.setItem(
    STORAGE_KEYS.REDUX_PERSIST_ROOT,
    JSON.stringify({
      theme: JSON.stringify(state.theme),
      firstPage: JSON.stringify(state.firstPage),
      guestLibrary: JSON.stringify(state.guestLibrary),
      settings: JSON.stringify(state.settings),
      _persist: JSON.stringify(state._persist),
    }),
  );
}
