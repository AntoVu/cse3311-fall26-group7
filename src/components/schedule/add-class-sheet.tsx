import { ManualAddClassForm } from '@/components/schedule/manual-add-class-form';
import { BottomSheet } from '@/components/ui/bottom-sheet';

type AddClassSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function AddClassSheet({ visible, onClose }: AddClassSheetProps) {
  return (
    <BottomSheet visible={visible} title="Add Class" onClose={onClose}>
      <ManualAddClassForm onSuccess={onClose} onCancel={onClose} showCancelButton />
    </BottomSheet>
  );
}
