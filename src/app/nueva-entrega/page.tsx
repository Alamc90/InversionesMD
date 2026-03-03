"use client"

import React from 'react';
import { IssueBikeView } from '@/views/IssueBikeView';
import { MainLayout } from '@/components/MainLayout';

export default function NewDeliveryPage() {
    return (
        <MainLayout>
            <IssueBikeView />
        </MainLayout>
    );
}