import { ActivityFeed } from "../../../components/ActivityFeed";
import { AITeachingAssistant } from "../../../components/AITeachingAssistant";
import { CommunicationHub } from "../../../components/CommunicationHub";
import { ConsistencyChart } from "../../../components/ConsistencyChart";
import { MistakeHeatmap } from "../../../components/MistakeHeatmap";
import { StudentHeader } from "../../../components/StudentHeader";
import { TeacherAIReport } from "../../../components/TeacherAIReport";
import { UploadSheetMusic } from "../../../components/UploadSheetMusic";
import { VelocityChart } from "../../../components/VelocityChart";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudentPage({ params }: Props) {
  const { id } = await params;

  const nameMap: Record<string, string> = {
    "1": "Danny Cohen",
    "2": "Sarah Levi",
    "3": "Tom Katz",
    "4": "Maya Shapiro",
  };

  const name = nameMap[id] ?? "Student";

  return (
    <main className="min-h-full px-8 pt-24">
      <div className="mx-auto max-w-7xl space-y-6">
        <StudentHeader name={name} />
        <AITeachingAssistant />
        <UploadSheetMusic studentId={Number(id)} />
        <TeacherAIReport studentId={id} />
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
