import TeacherContentPage from "@/components/TeacherContentPage";
import {
  getTeacherPage,
  getTeacherPageMetadata,
} from "@/lib/teacherPageContent";

export const metadata = getTeacherPageMetadata("teachers");

export default function TeachersPage() {
  return <TeacherContentPage page={getTeacherPage("teachers")} />;
}
