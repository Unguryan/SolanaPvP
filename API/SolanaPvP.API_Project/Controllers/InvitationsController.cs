using Microsoft.AspNetCore.Mvc;
using SolanaPvP.API_Project.Extensions;
using SolanaPvP.Application.Interfaces.Services;
using SolanaPvP.Domain.Enums;

namespace SolanaPvP.API_Project.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InvitationsController : ControllerBase
{
    private readonly IInvitationService _invitationService;

    public InvitationsController(IInvitationService invitationService)
    {
        _invitationService = invitationService;
    }

    [HttpPost]
    public async Task<ActionResult<MatchInvitation>> CreateInvitation([FromBody] CreateInvitationRequest request)
    {
        try
        {
            var inviterPubkey = HttpContext.GetRequiredUserPubkey();
            request.InviterPubkey = inviterPubkey; // Set from header
            
            var invitation = await _invitationService.CreateInvitationAsync(request);
            return Ok(invitation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{invitationId}")]
    public async Task<ActionResult<MatchInvitation>> GetInvitation(int invitationId)
    {
        var invitation = await _invitationService.GetInvitationAsync(invitationId);
        if (invitation == null)
        {
            return NotFound($"Invitation {invitationId} not found");
        }

        return Ok(invitation);
    }

    [HttpGet("me")]
    public async Task<ActionResult<IEnumerable<MatchInvitation>>> GetMyInvitations(
        [FromQuery] InvitationStatus? status = null)
    {
        var pubkey = HttpContext.GetRequiredUserPubkey();
        var invitations = await _invitationService.GetUserInvitationsAsync(pubkey, status);
        return Ok(invitations);
    }

    [HttpGet("user/{pubkey}")]
    public async Task<ActionResult<IEnumerable<MatchInvitation>>> GetUserInvitations(
        string pubkey,
        [FromQuery] InvitationStatus? status = null)
    {
        var invitations = await _invitationService.GetUserInvitationsAsync(pubkey, status);
        return Ok(invitations);
    }

    [HttpPost("{invitationId}/accept")]
    public async Task<ActionResult<MatchInvitation>> AcceptInvitation(int invitationId)
    {
        try
        {
            var inviteePubkey = HttpContext.GetRequiredUserPubkey();
            var invitation = await _invitationService.AcceptInvitationAsync(invitationId, inviteePubkey);
            return Ok(invitation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{invitationId}/decline")]
    public async Task<ActionResult<MatchInvitation>> DeclineInvitation(int invitationId)
    {
        try
        {
            var inviteePubkey = HttpContext.GetRequiredUserPubkey();
            var invitation = await _invitationService.DeclineInvitationAsync(invitationId, inviteePubkey);
            return Ok(invitation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{invitationId}/cancel")]
    public async Task<ActionResult<MatchInvitation>> CancelInvitation(int invitationId)
    {
        try
        {
            var inviterPubkey = HttpContext.GetRequiredUserPubkey();
            var invitation = await _invitationService.CancelInvitationAsync(invitationId, inviterPubkey);
            return Ok(invitation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

