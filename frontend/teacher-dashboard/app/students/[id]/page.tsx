import { ActivityFeed } from "../../../components/ActivityFeed";
import { AITeachingAssistant } from "../../../components/AITeachingAssistant";
import { CommunicationHub } from "../../../components/CommunicationHub";
import { ConsistencyChart } from "../../../components/ConsistencyChart";
import { MistakeHeatmap } from "../../../components/MistakeHeatmap";
import { StudentHeader } from "../../../components/StudentHeader";
import { UploadSheetMusic } from "../../../components/UploadSheetMusic";
import { VelocityChart } from "../../../components/VelocityChart";

interface Props {
  params: { id: string };
}

export default function StudentPage({ params }: Props) {
  const nameMap: Record<string, string> = {
    "1": "Danny Cohen",
    "2": "Sarah Levi",
    "3": "Tom Katz",
    "4": "Maya Shapiro",
  };

  const name = nameMap[params.id] ?? "Student";

  return (
    <main className="min-h-full px-8 pt-24">
      <div className="mx-auto max-w-7xl space-y-6">
        <StudentHeader name={name} />
        <AITeachingAssistant />
        <UploadSheetMusic studentId={params.id} />
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
