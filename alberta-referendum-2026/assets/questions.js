// Ballot questions, numbered as on the official ballot (and on CBC's results page).
// `slug` is the race slug in CBC's feed; it does NOT follow ballot order.
// Each answer has a `side`: "blue" = separatist / provincial-autonomy answer
// (Yes on Q1–Q9), "red" = federalist answer. Only questions with `ready: true` have a page.
const YES_NO = { yes: { label: "Yes", side: "blue" }, no: { label: "No", side: "red" } };

window.QUESTIONS = {
  1:  { slug: "reduce-immigrant-jobs", short: "Provincial control of immigration", ready: true, answers: YES_NO,
        prompt: "Do you support the Government of Alberta taking increased control over immigration for the purposes of decreasing immigration to more sustainable levels, prioritizing economic migration and giving Albertans first priority on new employment opportunities?" },
  2:  { slug: "cancel-universal-healthcare", short: "Limit provincial programs by immigration status", ready: true, answers: YES_NO,
        prompt: "Do you support the Government of Alberta introducing a law mandating that only Canadian citizens, permanent residents and individuals with an Alberta-approved immigration status will be eligible for provincially-funded programs, such as health care, education and other social services?" },
  3:  { slug: "cancel-universal-support", short: "12-month residency for social supports", ready: true, answers: YES_NO,
        prompt: "Assuming that all Canadian citizens and permanent residents continue to qualify for social support programs as they do now, do you support the Government of Alberta introducing a law requiring all individuals with a non-permanent legal immigration status to reside in Alberta for at least 12 months before qualifying for any provincially-funded social support programs?" },
  4:  { slug: "charge-immigrants-fees", short: "Health/education fees for non-permanent residents", ready: true, answers: YES_NO,
        prompt: "Assuming that all Canadian citizens and permanent residents continue to qualify for public health care and education as they do now, do you support the Government of Alberta charging a reasonable fee or premium to individuals with a non-permanent immigration status living in Alberta for their and their family’s use of the healthcare and education systems?" },
  5:  { slug: "require-voter-id", short: "Proof of citizenship to vote", ready: true, answers: YES_NO,
        prompt: "Do you support the Government of Alberta introducing a law requiring individuals to provide proof of citizenship, such as a passport, birth certificate or citizenship card, to vote in an Alberta provincial election?" },
  6:  { slug: "ab-chooses-judges", short: "Provinces select superior court judges", ready: true, answers: YES_NO,
        prompt: "Do you support the Government of Alberta working with the governments of other willing provinces to amend the Canadian Constitution to have provincial governments, and not the federal government, select the justices appointed to provincial King’s Bench and Appeal courts?" },
  7:  { slug: "ab-chooses-senators", short: "Abolish the Senate", ready: true, answers: YES_NO,
        prompt: "Do you support the Government of Alberta working with the governments of other willing provinces to amend the Canadian Constitution to abolish the unelected federal Senate?" },
  8:  { slug: "opt-out-of-federal", short: "Opt out of federal programs with funding", ready: true, answers: YES_NO,
        prompt: "Do you support the Government of Alberta working with the governments of other willing provinces to amend the Canadian Constitution to allow provinces to opt out of federal programs that intrude on provincial jurisdiction such as health care, education, and social services, without a province losing any of the associated federal funding for use in its social programs?" },
  9:  { slug: "cancel-federal-paramountcy", short: "Provincial laws take priority over federal", ready: true, answers: YES_NO,
        prompt: "Do you support the Government of Alberta working with the governments of other willing provinces to amend the Canadian Constitution to better protect provincial rights from federal interference by giving a province’s laws dealing with provincial or shared areas of constitutional jurisdiction priority over federal laws when the province’s laws and federal laws conflict?" },
  10: { slug: "alberta-in-canada", short: "Remain in Canada or hold a separation referendum", ready: true,
        answers: { separate: { label: "Referendum", side: "blue" }, remain: { label: "Remain", side: "red" } },
        prompt: "Should Alberta remain a province of Canada, or should the Government of Alberta commence the legal process required under the Canadian Constitution to hold a binding provincial referendum on whether or not Alberta should separate from Canada?" },
};
