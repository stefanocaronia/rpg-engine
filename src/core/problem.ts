/** Something wrong in a campaign, the file it is in, and how to fix it. */
export interface Problem
{
    path?: string;
    message: string;
    fix?: string;
}
