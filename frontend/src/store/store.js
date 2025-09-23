import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import internshipSlice from './slices/internshipSlice';
import taskSlice from './slices/taskSlice';
import notificationSlice from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    internships: internshipSlice,
    tasks: taskSlice,
    notifications: notificationSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;