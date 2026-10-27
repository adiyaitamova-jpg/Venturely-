import type { Metadata } from "next";
import { Users } from "lucide-react";
import type { Availability, ExperienceLevel, ProjectCategory } from "@prisma/client";
import { requireUser } from "@/server/auth/current-user";
import { getFilterFacets, searchPeople } from "@/server/services/discovery";
import { listSkills } from "@/server/services/profile";
import { getInviteOptions } from "@/server/services/projects";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PersonCard } from "@/components/profile/person-card";
import { PeopleFilters } from "./people-filters";
import { AVAILABILITY, EXPERIENCE, PROJECT_CATEGORIES } from "@/lib/taxonomy";

export const metadata: Metadata = { title: "Discover people" };

type SP = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 100);
const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []).slice(0, 6).map((s) => s.slice(0, 64));
function enumParam<T extends string>(v: string | undefined, values: readonly { value: T }[]): T | undefined {
  return values.find((x) => x.value.toLowerCase() === v?.toLowerCase())?.value;
}

export default async function DiscoverPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser("/discover");
  const sp = await searchParams;
  const sortParam = one(sp.sort);
  const filters = {
    q: one(sp.q),
    major: one(sp.major),
    skillIds: many(sp.skill),
    category: enumParam<ProjectCategory>(one(sp.category), PROJECT_CATEGORIES),
    experience: enumParam<ExperienceLevel>(one(sp.experience), EXPERIENCE),
    availability: enumParam<Availability>(one(sp.availability), AVAILABILITY),
    language: one(sp.language),
    interest: one(sp.interest),
    sort: (sortParam === "ranking" || sortParam === "newest" ? sortParam : "relevance") as "relevance" | "ranking" | "newest",
    page: Math.max(1, Math.min(200, Number(one(sp.page)) || 1)),
  };
  const [results, skills, facets, inviteOptions] = await Promise.all([
    searchPeople(user.id, filters),
    listSkills(),
    getFilterFacets(user.id),
    getInviteOptions(user.id),
  ]);
  const paramsForPaging: Record<string, string | string[] | undefined> = {
    skill: filters.skillIds,
    q: filters.q,
    major: filters.major,
    category: one(sp.category),
    experience: one(sp.experience),
    availability: one(sp.availability),
    language: filters.language,
    interest: filters.interest,
    sort: sortParam,
  };

  return (
    <div>
      <PageHeader
        title="Discover people"
        description="Find teammates by what they can do and what they care about. Only members who chose to be discoverable appear here."
      />
      <PeopleFilters skills={skills} facets={facets}>
        <p className="mb-4 text-[13px] text-muted" aria-live="polite">
          {results.total === 0 ? "No matches" : `${results.total}${results.capped ? "+" : ""} ${results.total === 1 ? "person" : "people"}`}
          {filters.sort === "relevance" && results.total > 0 && " · sorted by relevance to your skills and interests"}
        </p>
        {results.items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No one matches those filters"
            description="Try removing a filter or searching for a broader skill. New members join every week."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {results.items.map((p) => (
              <PersonCard key={p.id} person={p} inviteOptions={inviteOptions} />
            ))}
          </div>
        )}
        <Pagination
          page={results.page}
          pageSize={results.pageSize}
          total={results.total}
          basePath="/discover"
          params={paramsForPaging}
        />
      </PeopleFilters>
    </div>
  );
}
