import React, { useState } from 'react';
import { Home } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export interface CreateHouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export const CreateHouseholdModal: React.FC<CreateHouseholdModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Household name is required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(name.trim());
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={<span className="flex items-center gap-2"><Home className="w-4 h-4 text-emerald-400" /> New household</span>}
      description="Creates a household and switches the dashboard to it."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={close} disabled={isLoading}>Cancel</Button>
          <Button variant="emerald" size="sm" onClick={handleSubmit} isLoading={isLoading}>Create</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Household name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Karachi Household"
          error={error ?? undefined}
          autoFocus
        />
      </form>
    </Modal>
  );
};
