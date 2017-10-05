

export type TagCount = number;
export type TagName = string;
export type EpochSeconds = number;

export class TagHistory {
    Tags: Map<TagName, TagCount>    
}

export class APIResponse<T> {
    StatusCode: number
    Message: string
    Data: T
}

export type TagHistoryResponse = APIResponse<Map<EpochSeconds, TagHistory>>

export enum FetchState {
    Idle,
    Fetching,
    FetchSuccess,
    FetchError
}