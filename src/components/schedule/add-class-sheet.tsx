import { ManualAddClassForm } from '@/components/schedule/manual-add-class-form';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { ScheduleClass } from '@/mocks/schedule';

type AddClassSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Change this class instead of adding one. */
  editing?: ScheduleClass;
};

export function AddClassSheet({ visible, onClose, editing }: AddClassSheetProps) {
  return (
    <BottomSheet visible={visible} title={editing ? 'Edit Class' : 'Add Class'} onClose={onClose}>
      <ManualAddClassForm key={editing?.id} editing={editing} onSuccess={onClose} onCancel={onClose} showCancelButton />
    </BottomSheet>
  );
}
