import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phoneNumber: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [phone, setPhone] = useState('+92');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setPhone('+92');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(phone.trim());
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={<span className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-emerald-400" /> Log in</span>}
      description="Demo login — resolve an existing user by their phone number."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={close} disabled={isLoading}>Cancel</Button>
          <Button variant="emerald" size="sm" onClick={handleSubmit} isLoading={isLoading}>Log in</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+923001234567"
          error={error ?? undefined}
          autoFocus
        />
      </form>
    </Modal>
  );
};
