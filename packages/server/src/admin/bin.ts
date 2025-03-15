import { program } from 'commander'
import Conf from 'conf'
import { checkbox, confirm, input, password, select } from '@inquirer/prompts'
import { Listr } from 'listr2'
import chalk from 'chalk'
import {
  LlmAnalyzeRequest,
  LlmAnalyzeResponse,
  ReviewRequest,
  ReviewUsersRequest,
  ReviewUsersResponse,
} from '../lib'

class ExpectError extends Error {
  constructor(message: string) {
    super(message)
  }
}

interface Config {
  env: 'dev' | 'prod'
  token: string
  serviceUrl: string
}

async function initConfig(): Promise<Config> {
  const env = await select<Config['env']>({
    message: 'Select env',
    choices: ['dev', 'prod'],
  })
  const config = new Conf({
    projectName: 'mass-block-twitter',
    configName: `${env}-config`,
  })
  if (!config.get('token')) {
    const token = await password({
      message: 'Enter your token',
    })
    config.set('token', token)
  }
  const token = config.get('token') as string
  const serviceUrl =
    env === 'dev'
      ? 'http://localhost:8787'
      : 'https://mass-block-twitter-server.rxliuli.com'
  return {
    env,
    token,
    serviceUrl,
  }
}

async function getReviewUsers(
  config: Config,
  status: ReviewUsersRequest['status'],
) {
  const resp = await fetch(
    `${config.serviceUrl}/api/analyze/users?status=${status}`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    },
  )
  if (!resp.ok) {
    throw new ExpectError(`Failed to scan: ${resp.status} ${resp.statusText}`)
  }
  return (await resp.json()) as ReviewUsersResponse
}

async function analyzeUser(config: Config, userId: string) {
  const resp1 = await fetch(`${config.serviceUrl}/api/analyze/llm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId } satisfies LlmAnalyzeRequest),
  })
  if (!resp1.ok) {
    throw new ExpectError(
      `Failed to analyze: ${resp1.status} ${resp1.statusText}`,
    )
  }
  return (await resp1.json()) as LlmAnalyzeResponse
}

async function analyzeUsers(config: Config) {
  const reviewUsers = await getReviewUsers(config, 'unanalyzed')
  console.log(`Total: ${reviewUsers.total}`)
  const selectedUserIds = await checkbox({
    message: 'Select users to analyze',
    choices: reviewUsers.users.map((it) => ({
      name: `${it.name} (https://x.com/${it.screenName})`,
      value: it.id,
    })),
  })
  const selectedUsers = reviewUsers.users.filter((it) =>
    selectedUserIds.includes(it.id),
  )
  const tasks = new Listr(
    selectedUsers.map((user) => ({
      title: `User: ${user.name} (${user.screenName}) - ${chalk.blue(
        'Waiting...',
      )}`,
      task: async (_ctx, subtask) => {
        try {
          subtask.title = `User: ${user.screenName} (${
            user.id
          }) - ${chalk.yellow('Analyzing...')}`

          const result = await analyzeUser(config, user.id)

          subtask.title = `User: ${user.screenName} (${
            user.id
          }) - ${chalk.green('Completed')}`

          return result
        } catch (error) {
          subtask.title = `User: ${user.screenName} (${user.id}) - ${chalk.red(
            'Failed',
          )} (${(error as Error).message})`
          throw error
        }
      },
      options: {
        persistentOutput: true,
      },
    })),
    {
      concurrent: 10,
      exitOnError: false,
    },
  )
  await tasks.run()
}

async function reviewUser(config: Config, req: ReviewRequest) {
  const resp = await fetch(`${config.serviceUrl}/api/analyze/review`, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  })
  if (!resp.ok) {
    throw new ExpectError(`Failed to review: ${resp.status} ${resp.statusText}`)
  }
}

async function reviewUsers(config: Config) {
  const unreviewUsers = await getReviewUsers(config, 'unreviewed')
  console.log(`Total: ${unreviewUsers.total}`)
  if (unreviewUsers.users.length === 0) {
    console.log('No unreviewed users')
    return
  }
  const selectedUserIds = await checkbox({
    message: 'Select user to review',
    choices: unreviewUsers.users.map((it) => ({
      name: `${it.name} (https://x.com/${it.screenName}) (${it.llmSpamRating})`,
      value: it.id,
    })),
  })
  const users = unreviewUsers.users.filter((it) =>
    selectedUserIds.includes(it.id),
  )
  if (users.length === 0) {
    console.log(chalk.red('Users not selected'))
    return
  }
  if (users.length === 1) {
    console.log(`LLMSpamExplanation: \n${users[0].llmSpamExplanation}\n`)
  }
  const isSpam = await confirm({
    message:
      `Is spam?\n` +
      users.map((it) => `- ${it.name} (${it.screenName})\n`).join(''),
  })
  const notes = await input({
    message: 'Enter notes',
    required: false,
  })
  const tasks = new Listr(
    users.map((user) => ({
      title: `User: ${user.name} (${user.screenName}) - ${chalk.blue(
        'Waiting...',
      )}`,
      task: async (_ctx, subtask) => {
        try {
          subtask.title = `User: ${user.name} (${
            user.screenName
          }) - ${chalk.yellow('Reviewing...')}`

          const result = await reviewUser(config, {
            userId: user.id,
            isSpam,
            notes,
          })

          subtask.title = `User: ${user.name} (${
            user.screenName
          }) - ${chalk.green('Completed')}`

          return result
        } catch (error) {
          subtask.title = `User: ${user.name} (${
            user.screenName
          }) - ${chalk.red('Failed')} (${(error as Error).message})`
          throw error
        }
      },
      options: {
        persistentOutput: true,
      },
    })),
    {
      concurrent: 10,
      exitOnError: false,
    },
  )
  await tasks.run()
  await reviewUsers(config)
}

async function reviewedUsers(config: Config) {
  const reviewedUsers = await getReviewUsers(config, 'reviewed')
  console.log(`Total: ${reviewedUsers.total}`)
  if (reviewedUsers.total === 0) {
    console.log('No reviewed users')
    return
  }
  const selectedUserId = await select({
    message: 'Select user to view',
    choices: reviewedUsers.users.map((it) => ({
      name: `${it.name} (${it.screenName}) (${
        it.isSpamByManualReview ? 'Spam' : 'Not Spam'
      })`,
      value: it.id,
    })),
  })
  const resp = await fetch(
    `${config.serviceUrl}/api/analyze/get/${selectedUserId}`,
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    },
  )
  if (!resp.ok) {
    throw new ExpectError(
      `Failed to get user: ${resp.status} ${resp.statusText}`,
    )
  }
  const userSpamAnalyze = await resp.json()
  console.log('userSpamAnalyze', userSpamAnalyze)
}

async function main(config: Config) {
  const action = await select({
    message: 'Select action',
    choices: [
      {
        name: 'Analyze users',
        value: 'analyzeUsers',
      },
      {
        name: 'Review users',
        value: 'reviewUsers',
      },
      {
        name: 'Reviewed users',
        value: 'reviewedUsers',
      },
      {
        name: 'Exit',
        value: 'exit',
      },
    ],
  })
  if (action === 'analyzeUsers') {
    await analyzeUsers(config)
  } else if (action === 'reviewUsers') {
    await reviewUsers(config)
  } else if (action === 'reviewedUsers') {
    await reviewedUsers(config)
  } else if (action === 'exit') {
    console.log('👋 until next time!')
  } else {
    console.log(chalk.red('Invalid action'))
  }
  await main(config)
}

program.action(async () => {
  const config = await initConfig()
  await main(config)
})

process.on('uncaughtException', async (error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log('👋 until next time!')
  } else if (error instanceof ExpectError) {
    console.log(chalk.red(error.message))
  } else {
    // Rethrow unknown errors
    throw error
  }
})

program.parse()
