import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { View } from 'react-native';

// Gorhom ignores expand() until native layout supplies the dynamic snap point.
// At first layout it opens at its provided index. Subsequent opens drive the ref.
type Methods = { expand(): void; close(): void };
export default function MeasuredSheet({
  ref,
  index,
  onClose,
  children,
}: {
  ref: Ref<Methods>;
  index: number;
  onClose(): void;
  children: ReactNode;
}) {
  const measured = useRef(false);
  const [open, setOpen] = useState(false);
  useImperativeHandle(ref, () => ({
    expand() {
      if (measured.current) setOpen(true);
    },
    close() {
      if (open) {
        setOpen(false);
        onClose();
      }
    },
  }));
  return (
    <View
      testID="native-sheet"
      onLayout={() => {
        if (!measured.current) {
          measured.current = true;
          setOpen(index >= 0);
        }
      }}
    >
      {open && children}
    </View>
  );
}
