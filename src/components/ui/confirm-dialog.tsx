"use client"

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './dialog';
import { Button } from './button';
import { Input } from './input';
import { AlertTriangle, Trash2, ShieldAlert, HelpCircle } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    /** If set, user must type this text to enable the confirm button */
    confirmText?: string;
    /** Hint shown below the input for confirmText */
    confirmHint?: string;
    onConfirm: () => void | Promise<void>;
    loading?: boolean;
}

const variantConfig: Record<ConfirmVariant, { icon: React.ReactNode; color: string; buttonVariant: 'destructive' | 'default' | 'outline' }> = {
    danger: {
        icon: <Trash2 className="h-6 w-6 text-red-500" />,
        color: 'bg-red-50 border-red-200',
        buttonVariant: 'destructive',
    },
    warning: {
        icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
        color: 'bg-yellow-50 border-yellow-200',
        buttonVariant: 'destructive',
    },
    info: {
        icon: <HelpCircle className="h-6 w-6 text-blue-500" />,
        color: 'bg-blue-50 border-blue-200',
        buttonVariant: 'default',
    },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    confirmText,
    confirmHint,
    onConfirm,
    loading = false,
}) => {
    const [typedText, setTypedText] = useState('');
    const config = variantConfig[variant];

    const canConfirm = confirmText ? typedText === confirmText : true;

    const handleConfirm = async () => {
        await onConfirm();
        setTypedText('');
    };

    const handleOpenChange = (v: boolean) => {
        if (!v) setTypedText('');
        onOpenChange(v);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full border ${config.color}`}>
                            {config.icon}
                        </div>
                        <div>
                            <DialogTitle>{title}</DialogTitle>
                        </div>
                    </div>
                    <DialogDescription className="pt-2">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                {confirmText && (
                    <div className="space-y-2 py-2">
                        <p className="text-sm text-muted-foreground">
                            {confirmHint || `Escribe "${confirmText}" para confirmar:`}
                        </p>
                        <Input
                            value={typedText}
                            onChange={(e) => setTypedText(e.target.value)}
                            placeholder={confirmText}
                            autoComplete="off"
                        />
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={config.buttonVariant}
                        onClick={handleConfirm}
                        disabled={!canConfirm || loading}
                    >
                        {loading ? 'Procesando...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
