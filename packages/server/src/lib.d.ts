import type { InferSelectModel } from 'drizzle-orm'
import type { modList, modListUser, modListSubscription } from './db/schema'

export type { AuthInfo } from './routes/auth'
export type ModList = InferSelectModel<typeof modList>
export type ModListUser = InferSelectModel<typeof modListUser>
export type ModListSubscription = InferSelectModel<typeof modListSubscription>
export type {
  TwitterUser,
  TwitterSpamReportRequest,
  CheckSpamUserRequest,
  CheckSpamUserResponse,
} from './routes/twitter'
export type {
  AccountSettingsResponse,
  AccountSettingsError,
} from './routes/accounts'
export type {
  ModListCreateRequest,
  ModListCreateResponse,
  ModListUpdateRequest,
  ModListRemoveRequest,
  ModListRemoveErrorResponse,
  ModListSubscribeRequest,
  ModListAddTwitterUserRequest,
  ModListAddTwitterUserResponse,
  ModListGetCreatedResponse,
  ModListGetErrorResponse,
  ModListGetResponse,
  ModListUserCheckRequest,
  ModListUserCheckResponse,
  ModListRemoveTwitterUserRequest,
  ModListUsersResponse,
  ModListUsersPageResponse,
  ModListSearchResponse,
  ModListSubscribeResponse,
  ModListSubscribedUserAndRulesResponse,
  ModListUserCheckPostRequest,
  ModListRulesPageResponse,
  ModListRule,
  ModListConditionItem,
  ModListAddRuleRequest,
  ModListUpdateRuleRequest,
  ModListAddTwitterUsersRequest,
  ModListAddTwitterUsersResponse,
  ModListUsersRequest,
  ModListAddRuleResponse,
  ModListRulesRequest,
  ModListUpdateRuleResponse,
  ModListAddTwitterUsersResponse,
  ModListAddTwitterUsersRequest,
} from './routes/modlists'
export type { CheckoutCompleteRequest } from './routes/billing'
export type {
  LoginRequest,
  LoginResponse,
  LoginErrorResponse,
  SendVerifyEmailRequest,
  VerifyEmailRequest,
  ResetPasswordRequest,
} from './routes/auth'
export type {
  ReviewUsersResponse,
  ReviewRequest,
  ReviewUsersRequest,
  LlmAnalyzeRequest,
  LlmAnalyzeResponse,
  UserSpamAnalyze,
} from './routes/analyze'
