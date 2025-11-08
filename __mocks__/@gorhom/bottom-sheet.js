import React from 'react';
import { View } from 'react-native';

// Mock BottomSheet component
const BottomSheet = React.forwardRef((props, ref) => {
  return React.createElement(View, { ...props, ref });
});

// Mock BottomSheetModal component (same as BottomSheet for testing)
const BottomSheetModal = React.forwardRef((props, ref) => {
  // Expose present/dismiss methods for imperative API
  React.useImperativeHandle(ref, () => ({
    present: jest.fn(),
    dismiss: jest.fn(),
    snapToIndex: jest.fn(),
    snapToPosition: jest.fn(),
    expand: jest.fn(),
    collapse: jest.fn(),
    close: jest.fn(),
    forceClose: jest.fn(),
  }));

  return React.createElement(View, { ...props, ref });
});

// Mock BottomSheetView component
const BottomSheetView = props => {
  return React.createElement(View, props);
};

// Mock BottomSheetBackdrop component
const BottomSheetBackdrop = props => {
  return React.createElement(View, props);
};

// Mock useBottomSheetDynamicSnapPoints hook
const useBottomSheetDynamicSnapPoints = () => ({
  animatedHandleHeight: { value: 0 },
  animatedSnapPoints: { value: [] },
  animatedContentHeight: { value: 0 },
  handleContentLayout: () => {},
});

// Mock constants
const SNAP_POINT_TYPE = {
  DYNAMIC: 'dynamic',
  FIXED: 'fixed',
};

module.exports = {
  __esModule: true,
  default: BottomSheet,
  BottomSheet,
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  useBottomSheetDynamicSnapPoints,
  SNAP_POINT_TYPE,
};
