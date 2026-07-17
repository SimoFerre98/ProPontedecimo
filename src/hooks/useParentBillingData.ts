import { useQuery } from '@tanstack/react-query'
import { getActiveSeasonDirect, getChildrenMedicalExpiry, type MyParentPlayer } from '@/services/parentService'
import { paymentService } from '@/services/paymentService'

export function useParentBillingData(confirmedChildren: MyParentPlayer[], isParent: boolean) {
  return useQuery({
    queryKey: ['parent-billing-data', confirmedChildren.map(c => c.player_id).join(',')],
    queryFn: async () => {
      if (confirmedChildren.length === 0) return []
      
      const activeSeason = await getActiveSeasonDirect()
      if (!activeSeason) return []
      
      const childIds = confirmedChildren.map(c => c.player_id)
      const expiries = await getChildrenMedicalExpiry(childIds)
      const expiryMap = new Map(expiries.map(e => [e.id, e.medical_expiry]))
      
      const billingDetails = await Promise.all(
        confirmedChildren.map(async (child) => {
          const payments = await paymentService.getPaymentsByPlayer(child.player_id, activeSeason.id)
          const medicalExpiry = expiryMap.get(child.player_id) ?? null
          
          return {
            childId: child.player_id,
            firstName: child.first_name,
            lastName: child.last_name,
            teamSector: child.team_sector,
            seasonName: activeSeason.name,
            medicalExpiry,
            payments,
          }
        })
      )
      
      return billingDetails
    },
    enabled: isParent && confirmedChildren.length > 0,
  })
}
