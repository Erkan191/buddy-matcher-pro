import TeacherContentPage from "@/components/TeacherContentPage";
import {
  getTeacherPage,
  getTeacherPageMetadata,
} from "@/lib/teacherPageContent";

export const metadata = getTeacherPageMetadata("avoid-repeat-student-pairings");

export default function AvoidRepeatStudentPairingsPage() {
  return (
    <TeacherContentPage page={getTeacherPage("avoid-repeat-student-pairings")} />
  );
}
