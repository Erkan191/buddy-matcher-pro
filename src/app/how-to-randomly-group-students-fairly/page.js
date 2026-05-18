import TeacherContentPage from "@/components/TeacherContentPage";
import {
  getTeacherPage,
  getTeacherPageMetadata,
} from "@/lib/teacherPageContent";

export const metadata = getTeacherPageMetadata(
  "how-to-randomly-group-students-fairly"
);

export default function HowToRandomlyGroupStudentsFairlyPage() {
  return (
    <TeacherContentPage
      page={getTeacherPage("how-to-randomly-group-students-fairly")}
    />
  );
}
