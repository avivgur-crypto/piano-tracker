import { ActivityFeed } from "../../../components/ActivityFeed";
import { CommunicationHub } from "../../../components/CommunicationHub";
import { ConsistencyChart } from "../../../components/ConsistencyChart";
import { MistakeHeatmap } from "../../../components/MistakeHeatmap";
import { SessionsList } from "../../../components/SessionsList";
import { StudentHeader } from "../../../components/StudentHeader";
import { TeacherAIReport } from "../../../components/TeacherAIReport";
import { UploadSheetMusic } from "../../../components/UploadSheetMusic";
import { VelocityChart } from "../../../components/VelocityChart";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudentPage({ params }: Props) {
  const { id } = await params;
  // id is the student's user id in the DB — same id used for pieces, homework, notes on the student dashboard
  const nameMap: Record<string, string> = {
    "2": "Danny Cohen",
    "3": "Sarah Levi",
    "4": "Tom Katz",
    "5": "Maya Shapiro",
  };

  const name = nameMap[id] ?? "Student";

  return (
    <main className="min-h-full px-8 pt-24">
      <div className="mx-auto max-w-7xl space-y-6">
        <StudentHeader name={name} />
        <UploadSheetMusic studentId={Number(id)} />
        <SessionsList studentId={id} />
        <div id="ai-report-section">
          <TeacherAIReport studentId={id} />
        </div>
        <CommunicationHub />
        <ConsistencyChart />
        <div className="grid gap-6 lg:grid-cols-2">
          <MistakeHeatmap />
          <VelocityChart />
        </div>
      </div>
    </main>
  );
}
