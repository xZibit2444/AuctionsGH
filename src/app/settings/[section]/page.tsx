import { notFound } from 'next/navigation';
import SettingsPage, { type Section } from '@/components/settings/SettingsPage';

const SECTIONS: Section[] = ['profile', 'notifications', 'security'];

export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
    const { section } = await params;
    if (!SECTIONS.includes(section as Section)) notFound();
    return <SettingsPage section={section as Section} />;
}
