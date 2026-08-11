export type YpLandingSectionId = "get-involved" | "about-us" | "faqs";

export interface YpLandingPageNavLink {
  id: YpLandingSectionId;
  label: string;
}

export interface YpLandingPageExample {
  title: string;
  description: string;
}

export interface YpLandingPageCriteriaItem {
  lead: string;
  text: string;
}

export interface YpLandingPageCriteriaGroup {
  heading: string;
  items: YpLandingPageCriteriaItem[];
}

export interface YpLandingPageFaqItem {
  question: string;
  answer: string;
}

export const LOGO_PLACEHOLDER_LABEL = "Logo";
export const VIDEO_PLACEHOLDER_LABEL = "Video placeholder";
export const IMAGE_PLACEHOLDER_LABEL = "Image placeholder";
export const LOGO_IMAGE_PLACEHOLDER_LABEL = "Logo placeholder";
export const SHARE_IDEA_BUTTON_LABEL = "Share your idea";
export const CAROUSEL_REGION_LABEL = "Examples of small ideas";

export const NAV_LINKS: YpLandingPageNavLink[] = [
  { id: "get-involved", label: "Get Involved" },
  { id: "about-us", label: "About Us" },
  { id: "faqs", label: "FAQs" },
];

export const INTRO_CONTENT = {
  eyebrow: "The Institute for Small Ideas",
  heading: "Getting government to fix the small stuff",
  quote:
    "“I think small ideas to fix life's frustrations deserve the same serious policy concentration as the big ones because if we get it right, they add up – and bit by bit, we can make day-to-day life better for everyone.”",
  attributionName: "Martin Lewis",
  attributionRole:
    "Money Saving Expert, Chair of the Institute for Small Ideas",
};

export const GET_INVOLVED_CONTENT = {
  heading: "Get Involved",
  eyebrow: "Change starts with your small idea.",
  paragraphs: [
    "Ever thought, “why don’t they just fix it?” This is the place for you. We want your ideas for practical, non-controversial ways to improve the UK.",
    "What are the small things that matter to you? Health, schools, transport, business, housing, policing, justice, tech, shopping, money – or something else entirely?",
    "We’ll take the best ideas, turn them into professional policy, and push them under the noses of the people who can make them happen.",
  ],
};

export const HOW_IT_WORKS_CONTENT: {
  heading: string;
  steps: YpLandingPageExample[];
} = {
  heading: "How it works",
  steps: [
    {
      title: "01: Send us your idea",
      description:
        "Small, do-able, non-political - the stuff that'd actually make life better.",
    },
    {
      title: "02: Our policy advisers narrow the list of ideas",
      description:
        "They'll sift through your ideas to select the ones that meet the criteria.",
    },
    {
      title: "03: You get to weigh in",
      description: "We publish the long-list for your feedback.",
    },
    {
      title: "04: Our panel, chaired by Martin, picks the final ones",
      description: "The cross-party panel choose which ideas go forward.",
    },
    {
      title: "05: We campaign to make them happen",
      description:
        "Government, opposition, regulators, whoever needs to hear it.",
    },
  ],
};

export const KIND_OF_THING_CONTENT: {
  heading: string;
  paragraphs: string[];
  examples: YpLandingPageExample[];
} = {
  heading: "The kind of thing we mean",
  paragraphs: [
    "Think about something that happened to you or someone you care about – or something that should exist, but doesn’t. Was there a rule that made no sense, or something that should’ve been simple, and wasn’t, or a gap no-one filled? Health, community, education, transport, money, the environment, or anything else – if it’s real to you, it counts.",
    "Here’s a few, some that’ve been campaigned on already, some not, we want yours…",
  ],
  examples: [
    {
      title: "Universal allergy symbols",
      description:
        "One standard allergy symbol system, on every menu, everywhere - because working out if a dish is safe should be simple.",
    },
    {
      title: "Non-branded school uniform",
      description:
        "Every state-funded school to allow non-branded uniform and PE kits to reduce costs.",
    },
    {
      title: "Real-time sewage alerts",
      description:
        "Real-time sewage alerts visible at every beach (not just the ones water companies choose to monitor). We should know before we get in!",
    },
    {
      title: "Consistent council forms",
      description:
        "Severe Mental Impairment council tax relief is the same wherever you live, so why does each council use a different form with different requirements? One form, everywhere.",
    },
    {
      title: "Fairer car parking charges",
      description:
        "Payment meters should let you pay only for the time you're actually parked - not a guess made before you get out of the car.",
    },
    {
      title: "Easy-to-understand care home costs",
      description:
        "There should be a standard format for care home costs to make comparing easier.",
    },
    {
      title: "Clearer naming of childcare schemes",
      description:
        "“Tax-Free Childcare” isn't free, and it's not about tax. Call it what it is - the Working Families Childcare Top-Up - so people actually understand what they're entitled to.",
    },
  ],
};

export const SMALL_IDEA_CONTENT: {
  heading: string;
  leadIn: string;
  criteria: YpLandingPageCriteriaGroup[];
} = {
  heading: "What is a small idea?",
  leadIn:
    "A small idea is a practical fix for something that affects everyday life.",
  criteria: [
    {
      heading: "What ideas will make the cut?",
      items: [
        { lead: "Practical", text: "a solution, not just a complaint" },
        {
          lead: "Do-able",
          text: "it must be something that could realistically change",
        },
        {
          lead: "Relatively inexpensive",
          text: "if it costs too much, government, regulators, or councils won’t do it",
        },
        {
          lead: "A widespread issue",
          text: "whether it could help millions of people a little, or thousands of people a lot",
        },
        {
          lead: "And crucially… hard to disagree with",
          text: "the kind of thing that 80% of people, whatever their politics, would say “yeah, that makes sense”.",
        },
      ],
    },
    {
      heading: "What we’ll say no to:",
      items: [
        {
          lead: "Too local",
          text: "a drinking water fountain in your local park won’t cut it",
        },
        {
          lead: "Overly political",
          text: "no party lines, and no dog whistles",
        },
        { lead: "Illegal", text: "breaks the law, criminal or otherwise." },
        { lead: "Harmful", text: "nothing that harms people or animals." },
      ],
    },
  ],
};

export const MARTIN_CONTENT = {
  heading: "Martin explains why small ideas matter",
  paragraphs: [
    "“I think small ideas to fix life’s frustrations deserve the same serious policy concentration as the big ones because if we get it right, they add up – and bit by bit we can make day-to-day life better for everyone.",
    "Yet when governments get elected, they often have the big things they want to change so they can leave a legacy. Growth, taxes, the NHS, defence. All that’s important, but often controversial, and sometimes risks the next government unwinding it. Yet small, less controversial, changes can have a quick direct impact on people’s lives, but they are sometimes hard to get through the government as they’re not ‘big enough’. That needs to change and we need your help to do it.",
    "While I’ve always focused on the world of money, this is about more than that, whether it’s health, your community, transport, education or something else. What are your small ideas to improve our country at speed, in a way that everyone will agree with? It could be a small change that helps millions, or a change that only helps thousands but has a big impact.”",
  ],
};

export const ABOUT_US_CONTENT: {
  heading: string;
  paragraphs: string[];
  ledByLabel: string;
  leaders: string[];
} = {
  heading: "About Us",
  paragraphs: [
    "The Institute for Small Ideas is a non-partisan project. It was founded, and is funded in a personal capacity by Martin Lewis, Money Saving Expert, who is our Chair.",
    "It’s run by two charities, Nesta’s Centre for Collective Intelligence and Involve. They organise the logistics of taking your ideas, sharpening them, and supporting Martin to get them in front of the people who can act. And because no one trusts an idea that only one side likes, we’ve got a cross-party panel of politicians and policy experts helping us work out which ideas can actually get support, and which are workable.",
  ],
  ledByLabel: "Led by:",
  leaders: [
    "Martin Lewis, Chair",
    "Kathy Peach, Co-Director",
    "Sue Tibbals, Co-Director",
  ],
};

export const FAQS_CONTENT: {
  heading: string;
  items: YpLandingPageFaqItem[];
} = {
  heading: "FAQs",
  items: [
    {
      question: "Do I need an account to take part?",
      answer:
        "You can browse most content without one, but you'll need to register to submit ideas, comment, or rate other people's contributions.",
    },
    {
      question: "Is my information kept private?",
      answer:
        "We only use your information to run the platform and never sell it to third parties. See our privacy policy for full details.",
    },
    {
      question: "Who can I contact if I have questions?",
      answer:
        "You'll find contact details for the team running this community in the footer of the site.",
    },
  ],
};
