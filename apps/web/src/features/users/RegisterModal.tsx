import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { UserRegisterRequest } from '../../types/api';

export interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: UserRegisterRequest) => Promise<void>;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+92');
  const [email, setEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName('');
    setPhone('+92');
    setEmail('');
    setHouseholdName('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone number are required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit({
        full_name: name.trim(),
        phone_number: phone.trim(),
        email: email.trim() || undefined,
        household_name: householdName.trim() || undefined,
      });
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={<span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400" /> Register</span>}
      description="Create a new user. Leave the household name blank to start a fresh household."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={close} disabled={isLoading}>Cancel</Button>
          <Button variant="emerald" size="sm" onClick={handleSubmit} isLoading={isLoading}>Register</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha" autoFocus />
        <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+923001234567" />
        <Input label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ayesha@example.com" />
        <Input
          label="New household name (optional)"
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          placeholder="e.g. Lahore House"
          error={error ?? undefined}
        />
      </form>
    </Modal>
  );
};
