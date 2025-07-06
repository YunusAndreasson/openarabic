import React from 'react';
import { View } from 'react-native';

// Mock BottomSheet component
const BottomSheet = React.forwardRef((props, ref) => {
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
  BottomSheetView,
  BottomSheetBackdrop,
  useBottomSheetDynamicSnapPoints,
  SNAP_POINT_TYPE,
};
