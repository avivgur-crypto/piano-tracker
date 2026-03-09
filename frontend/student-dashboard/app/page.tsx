import { Achievements } from "@/components/Achievements";
import { HomeworkCard } from "@/components/HomeworkCard";
import { TeacherNotes } from "@/components/TeacherNotes";
import { WeeklyPracticeGraph } from "@/components/WeeklyPracticeGraph";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1C1F2E] px-6 pb-12 pt-24">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-white">Hey Danny! 👋</h1>
          <p className="mt-2 text-sm text-[#B0B7D6]">
            You&apos;re on a <span className="font-semibold text-[#FFD900]">🔥 3-day streak</span>! Keep it up!
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
            <div className="flex items-center gap-3 text-lg font-semibold text-white">
              <span className="text-[#FF7A00]">🔥</span>
              Streak
            </div>
            <div className="mt-4 text-3xl font-bold text-[#FF7A00]">3 Days</div>
            <div className="mt-1 text-sm text-[#B0B7D6]">Current Streak</div>
          </div>

          <div className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
            <div className="flex items-center gap-3 text-lg font-semibold text-white">
              <span className="text-[#FFD900]">⚡</span>
              XP
            </div>
            <div className="mt-4 text-3xl font-bold text-[#FFD900]">1,240</div>
            <div className="mt-1 text-sm text-[#B0B7D6]">Total XP</div>
          </div>

          <div className="rounded-2xl bg-[#252A3D] p-6 shadow-xl">
            <div className="flex items-center gap-3 text-lg font-semibold text-white">
              <span className="text-[#58CC02]">🏆</span>
              Level
            </div>
            <div className="mt-4 text-3xl font-bold text-[#58CC02]">Level 4</div>
            <div className="mt-1 text-sm text-[#B0B7D6]">Piano Explorer</div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-[#252A3D] p-6 shadow-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[#B0B7D6]">1,240 / 1,500 XP to Level 5</div>
            </div>
            <div className="text-sm font-semibold text-[#B0B7D6]">Progress</div>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[83%] rounded-full bg-[#58CC02] transition-all duration-1000" />
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-6">
            <HomeworkCard />
            <TeacherNotes />
          </div>

          <div className="grid gap-6">
            <Achievements />
            <WeeklyPracticeGraph />
          </div>
        </section>
      </div>
    </div>
  );
}
