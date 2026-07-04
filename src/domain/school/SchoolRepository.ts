import type { School } from "../../features/schools/types";

export interface SchoolRepository {

  create(
    school: School
  ): Promise<void>;

}