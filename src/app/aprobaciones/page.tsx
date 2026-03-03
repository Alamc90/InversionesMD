"use client"

import React from 'react';
import { MainLayout } from '@/components/MainLayout';
import { PaymentApprovalsView } from '@/views/PaymentApprovalsView';

export default function AprobacionesPage() {
    return (
        <MainLayout>
            <PaymentApprovalsView />
        </MainLayout>
    );
}
