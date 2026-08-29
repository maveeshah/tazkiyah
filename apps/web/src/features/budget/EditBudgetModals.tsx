import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type {
  EnvelopeGroupResponse,
  EnvelopeGroupUpdate,
  EnvelopeResponse,
  EnvelopeUpdate,
} from '../../types/api';

interface EditEnvelopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  envelope: EnvelopeResponse | null;
  onSubmit: (envelopeId: string, payload: EnvelopeUpdate) => Promise<unknown>;
  onDelete: (envelopeId: string) => Promise<unknown>;
}

export const EditEnvelopeModal: React.FC<EditEnvelopeModalProps> = ({
  isOpen,
  onClose,
  envelope,
  onSubmit,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (envelope) {
      setName(envelope.name);
      setTarget(envelope.target_amount != null ? String(envelope.target_amount) : '');
      setError(null);
    }
  }, [envelope]);

  if (!envelope) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(envelope.id, {
        name: name.trim(),
        target_amount: target ? parseFloat(target) : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update envelope');
    } finally {
      setIsLoading(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete envelope "${envelope.name}"?`)) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(envelope.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete envelope');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Pencil className="w-4 h-4 text-emerald-400" /> Edit envelope</span>}
      description="Assigned and spent amounts are managed through Assign / Rebalance / transactions."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Envelope name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input
          label="Monthly target (optional)"
          type="number"
          step="0.01"
          prefixText="PKR"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        {error && <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">{error}</div>}
        <div className="flex items-center justify-between gap-3 mt-2 pt-4 border-t border-slate-800">
          <Button type="button" variant="danger" size="sm" onClick={del} isLoading={isDeleting} leftIcon={<Trash2 className="w-4 h-4" />}>
            Delete
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="emerald" size="sm" isLoading={isLoading}>Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: EnvelopeGroupResponse | null;
  onSubmit: (groupId: string, payload: EnvelopeGroupUpdate) => Promise<unknown>;
  onDelete: (groupId: string) => Promise<unknown>;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({ isOpen, onClose, group, onSubmit, onDelete }) => {
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setSortOrder(String(group.sort_order));
      setError(null);
    }
  }, [group]);

  if (!group) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await onSubmit(group.id, { name: name.trim(), sort_order: parseInt(sortOrder, 10) || 0 });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setIsLoading(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete group "${group.name}" and its ${group.envelopes.length} envelope(s)?`)) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete(group.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Pencil className="w-4 h-4 text-emerald-400" /> Edit group</span>}
      description="Deleting a group also deletes its envelopes (blocked if any have transactions)."
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <Input label="Sort order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        {error && <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">{error}</div>}
        <div className="flex items-center justify-between gap-3 mt-2 pt-4 border-t border-slate-800">
          <Button type="button" variant="danger" size="sm" onClick={del} isLoading={isDeleting} leftIcon={<Trash2 className="w-4 h-4" />}>
            Delete
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="emerald" size="sm" isLoading={isLoading}>Save</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
