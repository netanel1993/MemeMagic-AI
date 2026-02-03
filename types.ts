
export interface MemeState {
  image: string | null;
  topText: string;
  bottomText: string;
  fontSize: number;
  textColor: string;
}

export interface MemeTemplate {
  id: string;
  url: string;
  name: string;
}

export interface CaptionSuggestion {
  top: string;
  bottom: string;
}
