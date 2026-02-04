/**
 * DAO Governance Indexer - Event Handlers
 *
 * Handles Governor contract events to build aggregated proposal data.
 * Compatible with dao-frontend ProposalApiResponse interface.
 *
 */

import { Governor, Proposal, Vote } from 'generated'
import { getQuorum } from './effects/quorumEffect'

// =============================================================================
// ProposalCreated Handler
// =============================================================================

Governor.ProposalCreated.handler(async ({ event, context }) => {
  const proposalId = event.params.proposalId.toString()

  // Fetch quorum at snapshot block via Effect API
  const quorum = await context.effect(getQuorum, {
    voteStart: event.params.voteStart,
    governorAddress: event.srcAddress,
  })

  const entity: Proposal = {
    id: proposalId,
    proposalId: event.params.proposalId,
    proposer: event.params.proposer,
    description: event.params.description,
    targets: event.params.targets,
    calldatas: event.params.calldatas,
    signatures: event.params.signatures,
    values: event.params.values,
    voteStart: event.params.voteStart,
    voteEnd: event.params.voteEnd,
    createdAtBlock: BigInt(event.block.number),
    createdAt: BigInt(event.block.timestamp),
    // Initialize vote counts to zero
    votesFor: 0n,
    votesAgainst: 0n,
    votesAbstains: 0n,
    // Quorum fetched via RPC
    quorum,
    // Initialize state flags
    isCanceled: false,
    isExecuted: false,
    isQueued: false,
    etaSeconds: undefined,
  }

  context.Proposal.set(entity)
})

// =============================================================================
// VoteCast Handler
// =============================================================================

Governor.VoteCast.handler(async ({ event, context }) => {
  const proposalId = event.params.proposalId.toString()
  const proposal = await context.Proposal.get(proposalId)

  if (!proposal) {
    context.log.warn(`VoteCast: Proposal ${proposalId} not found`)
    return
  }

  const support = event.params.support
  const weight = event.params.weight

  // Aggregate votes based on support type
  // support: 0 = Against, 1 = For, 2 = Abstain
  const supportNum = Number(support)
  const updatedProposal: Proposal = {
    ...proposal,
    votesFor: supportNum === 1 ? proposal.votesFor + weight : proposal.votesFor,
    votesAgainst:
      supportNum === 0 ? proposal.votesAgainst + weight : proposal.votesAgainst,
    votesAbstains:
      supportNum === 2 ? proposal.votesAbstains + weight : proposal.votesAbstains,
  }

  context.Proposal.set(updatedProposal)

  // Store individual vote record
  const voteId = `${proposalId}-${event.params.voter}-${event.logIndex}`
  const vote: Vote = {
    id: voteId,
    proposalId: event.params.proposalId,
    voter: event.params.voter,
    support: supportNum,
    weight,
    reason: event.params.reason,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
  }

  context.Vote.set(vote)
})

// =============================================================================
// VoteCastWithParams Handler
// =============================================================================

Governor.VoteCastWithParams.handler(async ({ event, context }) => {
  const proposalId = event.params.proposalId.toString()
  const proposal = await context.Proposal.get(proposalId)

  if (!proposal) {
    context.log.warn(`VoteCastWithParams: Proposal ${proposalId} not found`)
    return
  }

  const support = event.params.support
  const weight = event.params.weight

  // Aggregate votes based on support type
  const supportNum = Number(support)
  const updatedProposal: Proposal = {
    ...proposal,
    votesFor: supportNum === 1 ? proposal.votesFor + weight : proposal.votesFor,
    votesAgainst:
      supportNum === 0 ? proposal.votesAgainst + weight : proposal.votesAgainst,
    votesAbstains:
      supportNum === 2 ? proposal.votesAbstains + weight : proposal.votesAbstains,
  }

  context.Proposal.set(updatedProposal)

  // Store individual vote record
  const voteId = `${proposalId}-${event.params.voter}-${event.logIndex}`
  const vote: Vote = {
    id: voteId,
    proposalId: event.params.proposalId,
    voter: event.params.voter,
    support: supportNum,
    weight,
    reason: event.params.reason,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
  }

  context.Vote.set(vote)
})

// =============================================================================
// ProposalCanceled Handler
// =============================================================================

Governor.ProposalCanceled.handler(async ({ event, context }) => {
  const proposalId = event.params.proposalId.toString()
  const proposal = await context.Proposal.get(proposalId)

  if (!proposal) {
    context.log.warn(`ProposalCanceled: Proposal ${proposalId} not found`)
    return
  }

  const updatedProposal: Proposal = {
    ...proposal,
    isCanceled: true,
  }

  context.Proposal.set(updatedProposal)
})

// =============================================================================
// ProposalExecuted Handler
// =============================================================================

Governor.ProposalExecuted.handler(async ({ event, context }) => {
  const proposalId = event.params.proposalId.toString()
  const proposal = await context.Proposal.get(proposalId)

  if (!proposal) {
    context.log.warn(`ProposalExecuted: Proposal ${proposalId} not found`)
    return
  }

  const updatedProposal: Proposal = {
    ...proposal,
    isExecuted: true,
  }

  context.Proposal.set(updatedProposal)
})

// =============================================================================
// ProposalQueued Handler
// =============================================================================

Governor.ProposalQueued.handler(async ({ event, context }) => {
  const proposalId = event.params.proposalId.toString()
  const proposal = await context.Proposal.get(proposalId)

  if (!proposal) {
    context.log.warn(`ProposalQueued: Proposal ${proposalId} not found`)
    return
  }

  const updatedProposal: Proposal = {
    ...proposal,
    isQueued: true,
    etaSeconds: event.params.etaSeconds,
  }

  context.Proposal.set(updatedProposal)
})
