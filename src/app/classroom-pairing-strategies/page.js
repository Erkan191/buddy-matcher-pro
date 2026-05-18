import TeacherContentPage from "@/components/TeacherContentPage";
import {
  getTeacherPage,
  getTeacherPageMetadata,
} from "@/lib/teacherPageContent";

export const metadata = getTeacherPageMetadata("classroom-pairing-strategies");

export default function ClassroomPairingStrategiesPage() {
  return (
    <TeacherContentPage page={getTeacherPage("classroom-pairing-strategies")} />
  );
}
