"use client"

import React from 'react';
import { MainLayout } from '@/components/MainLayout';
import { UserManagementView } from '@/views/UserManagementView';

export default function UsuariosPage() {
    return (
        <MainLayout>
            <UserManagementView />
        </MainLayout>
    );
}
