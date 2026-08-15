import TabBar from '@/components/TabBar';

export default function CompetitionLayout({
  children, params,
}: { children: React.ReactNode; params: { id: string } }) {
  return (
    <>
      {children}
      <TabBar competitionId={params.id} />
    </>
  );
}
