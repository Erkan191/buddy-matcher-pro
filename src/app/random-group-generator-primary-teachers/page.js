import TeacherContentPage from "@/components/TeacherContentPage";
import {
  getTeacherPage,
  getTeacherPageMetadata,
} from "@/lib/teacherPageContent";

export const metadata = getTeacherPageMetadata(
  "random-group-generator-primary-teachers"
);

export default function RandomGroupGeneratorPrimaryTeachersPage() {
  return (
    <TeacherContentPage
      page={getTeacherPage("random-group-generator-primary-teachers")}
    />
  );
}
