import TeacherContentPage from "@/components/TeacherContentPage";
import {
  getTeacherPage,
  getTeacherPageMetadata,
} from "@/lib/teacherPageContent";

export const metadata = getTeacherPageMetadata("random-student-group-generator");

export default function RandomStudentGroupGeneratorPage() {
  return (
    <TeacherContentPage page={getTeacherPage("random-student-group-generator")} />
  );
}
