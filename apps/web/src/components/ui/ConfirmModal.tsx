import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => undefined : onClose}
      title={
        <span className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${danger ? 'text-rose-400' : 'text-amber-400'}`} />
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'emerald'} size="sm" onClick={handleConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-300">{message}</div>
      {error && <p className="text-xs text-rose-400 mt-3">{error}</p>}
    </Modal>
  );
};
