import { PageHeader, SimulatedNotice } from "@/components/ui";
import { COMPANIES, SECTORS } from "@/lib/companies";
import CompanyTable from "./CompanyTable";

export const metadata = { title: "Companies — RPTScan" };

export default function CompaniesPage() {
  return (
    <>
      <PageHeader eyebrow="Study universe" title="100 NSE companies">
        RPT intensity, disclosure quality and governance flags for every company in the study. Click a company to see it against its sector.
      </PageHeader>
      <SimulatedNotice />
      <CompanyTable companies={COMPANIES} sectors={SECTORS} />
    </>
  );
}
