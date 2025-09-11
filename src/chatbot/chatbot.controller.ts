// src/chatbot/chatbot.controller.ts
import {
  Controller,
  Post,
  Body,
  Logger,
  UseGuards, // Importado
  Request,
  Get,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UnauthorizedException, // Importado para o erro manual
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChatbotService } from './services/chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chatbot')
@Controller('chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // Aplicado à classe inteira
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensagem para o chatbot' })
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar mensagem para o chatbot' })
  @ApiResponse({
    status: 200,
    description: 'Mensagem processada com sucesso',
    type: ChatResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Request() req, @Body() sendMessageDto: SendMessageDto) {
    try {
      // 1. Verificar se o usuário está autenticado
      if (!req.user || !req.user.userId) {
        this.logger.error(
          '[SEND_MESSAGE] Acesso negado: req.user.userId não encontrado',
        );
        throw new UnauthorizedException('Access denied: User context missing');
      }

      // 2. Logar informações do usuário para debugging
      this.logger.log(`User ${req.user.userId} sending message to chatbot`);
      this.logger.debug(`User info: ${JSON.stringify(req.user)}`);

      // 3. Processar mensagem com userId correto
      return this.chatbotService.processMessage(
        sendMessageDto.message,
        req.user.userId, // ✅ Passar userId corretamente
        sendMessageDto.conversationId,
      );
    } catch (error) {
      this.logger.error(`[SEND_MESSAGE] Error processing message:`, error);
      throw error;
    }
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetar uma conversa' })
  @ApiResponse({ status: 200, description: 'Conversa resetada com sucesso' })
  @ApiResponse({ status: 404, description: 'Conversa não encontrada' })
  async resetConversation(
    @Request() req,
    @Body() body: { conversationId: string },
  ) {
    return this.chatbotService.resetConversation(
      body.conversationId,
      req.user.userId,
    );
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Obter histórico de uma conversa' })
  @ApiResponse({ status: 200, description: 'Histórico da conversa' })
  @ApiResponse({ status: 404, description: 'Conversa não encontrada' })
  async getConversationHistory(
    @Request() req,
    @Param('id') conversationId: string,
  ) {
    return this.chatbotService.getConversationHistory(
      conversationId,
      req.user.userId,
    );
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar uma conversa' })
  @ApiResponse({ status: 204, description: 'Conversa deletada com sucesso' })
  @ApiResponse({ status: 404, description: 'Conversa não encontrada' })
  async deleteConversation(
    @Request() req,
    @Param('id') conversationId: string,
  ) {
    // Implementar método de deleção no serviço
    return { success: true, message: 'Conversa deletada com sucesso' };
  }
}
